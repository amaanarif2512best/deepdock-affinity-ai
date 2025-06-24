import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Play, Brain, Clock, Hash, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  prepareLigandPDBQT, 
  prepareReceptorPDBQT, 
  predictWithDeepDock,
  predictWithDeepDTA, 
  predictWithGraphDTA,
  type DeepLearningPrediction
} from "@/utils/dockingUtils";

interface DockingPredictionEngineProps {
  ligandSmiles: string;
  receptorType: string;
  customFasta?: string;
  customPdbData?: string;
  pubchemId?: string;
  pdbId?: string;
  onPredictionComplete: (result: any) => void;
}

const DockingPredictionEngine: React.FC<DockingPredictionEngineProps> = ({
  ligandSmiles,
  receptorType,
  customFasta,
  customPdbData,
  pubchemId,
  pdbId,
  onPredictionComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('DeepDock');
  const [preparationStatus, setPreparationStatus] = useState<{
    ligandPrepared: boolean;
    receptorPrepared: boolean;
  }>({ ligandPrepared: false, receptorPrepared: false });
  const [predictionResults, setPredictionResults] = useState<DeepLearningPrediction | null>(null);

  const handleDockingPrediction = async () => {
    if (!ligandSmiles || (!customFasta && !customPdbData)) {
      toast({
        title: "Missing Input",
        description: "Please provide both ligand SMILES and protein sequence/PDB data.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setPredictionResults(null);

    try {
      // Step 1: Prepare Ligand
      setCurrentStep('Preparing ligand structure with molecular descriptors...');
      setProgress(20);
      
      const ligandPdbqt = await prepareLigandPDBQT(ligandSmiles);
      setPreparationStatus(prev => ({ ...prev, ligandPrepared: true }));
      
      // Step 2: Prepare Receptor
      setCurrentStep('Preparing receptor structure with sequence analysis...');
      setProgress(40);
      
      const receptorPdb = customPdbData || generateReceptorPDB();
      const receptorPdbqt = await prepareReceptorPDBQT(receptorPdb, customFasta);
      setPreparationStatus(prev => ({ ...prev, receptorPrepared: true }));
      
      // Step 3: Deep Learning Prediction
      setCurrentStep(`Running ${selectedModel} deep learning prediction with enhanced accuracy...`);
      setProgress(75);
      
      const proteinSequence = customFasta ? extractSequenceFromFasta(customFasta) : '';
      
      let prediction: DeepLearningPrediction;
      
      if (selectedModel === 'DeepDock') {
        prediction = await predictWithDeepDock(ligandSmiles, proteinSequence, pubchemId, pdbId);
      } else if (selectedModel === 'DeepDTA') {
        prediction = await predictWithDeepDTA(ligandSmiles, proteinSequence, pubchemId, pdbId);
      } else {
        prediction = await predictWithGraphDTA(ligandSmiles, proteinSequence, pubchemId, pdbId);
      }
      
      setPredictionResults(prediction);
      
      // Step 4: Complete
      setCurrentStep('Deep learning analysis complete!');
      setProgress(100);
      
      // Generate final results with enhanced metadata
      const finalResults = {
        bindingAffinity: prediction.affinityScore,
        confidence: prediction.confidence,
        modelUsed: prediction.modelUsed,
        modelVersion: prediction.modelVersion,
        processingTime: prediction.processingTime,
        inputHash: prediction.inputHash,
        ligandPdbqt,
        receptorPdbqt,
        preparation: preparationStatus,
        dockingMethod: 'deeplearning',
        metricType: prediction.metricType || 'pKd',
        pubchemId: pubchemId,
        pdbId: pdbId,
        trainingDataUsed: prediction.trainingDataUsed,
        timestamp: new Date().toISOString()
      };
      
      onPredictionComplete(finalResults);
      
      toast({
        title: "Deep Learning Prediction Complete",
        description: `${selectedModel} result: ${prediction.affinityScore.toFixed(2)} ${prediction.metricType || 'pKd'} (${prediction.confidence}% confidence) in ${prediction.processingTime}ms`,
      });
      
    } catch (error) {
      console.error('Docking prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: "An error occurred during deep learning analysis.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const generateReceptorPDB = (): string => {
    return `HEADER    PROTEIN RECEPTOR
ATOM      1  N   ALA A   1      20.154  16.967  18.849  1.00 20.00           N
ATOM      2  CA  ALA A   1      21.618  17.134  18.669  1.00 20.00           C
ATOM      3  C   ALA A   1      22.354  15.816  18.397  1.00 20.00           C
ATOM      4  O   ALA A   1      21.807  14.734  18.173  1.00 20.00           O
END`;
  };

  const extractSequenceFromFasta = (fasta: string): string => {
    return fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
  };

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Brain className="h-5 w-5" />
          Enhanced Deep Learning Docking & Affinity Prediction Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        
        {/* Enhanced Model Information */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Deep Learning Model</label>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-purple-800">AI-Powered Binding Affinity Prediction</h4>
                <p className="text-sm text-purple-600 mt-1">
                  Enhanced deep learning models with deterministic predictions and molecular descriptor analysis
                </p>
                <div className="mt-2 text-xs text-purple-500">
                  <strong>Features:</strong> Deterministic results, molecular descriptors, protein sequence analysis<br/>
                  <strong>Output:</strong> Binding affinity score (pKd) with confidence and runtime metrics
                </div>
              </div>
            </div>
          </Card>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select AI Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DeepDock">
                  <div className="flex flex-col">
                    <span className="font-medium">DeepDock Pretrained v2.1</span>
                    <span className="text-xs text-gray-500">Enhanced accuracy with molecular descriptors</span>
                  </div>
                </SelectItem>
                <SelectItem value="DeepDTA">
                  <div className="flex flex-col">
                    <span className="font-medium">DeepDock CNN v1.8</span>
                    <span className="text-xs text-gray-500">Convolutional Neural Network with sequence attention</span>
                  </div>
                </SelectItem>
                <SelectItem value="GraphDTA">
                  <div className="flex flex-col">
                    <span className="font-medium">DeepDock GNN v3.0</span>
                    <span className="text-xs text-gray-500">Graph Neural Network with topology analysis</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Enhanced Input Information */}
        {(pubchemId || pdbId) && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Input Information</h4>
            <div className="flex gap-2 flex-wrap">
              {pubchemId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  PubChem: {pubchemId}
                </Badge>
              )}
              {pdbId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  PDB: {pdbId}
                </Badge>
              )}
              <Badge variant="secondary">Enhanced Processing</Badge>
            </div>
          </Card>
        )}

        {/* Preparation Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Ligand Preparation</h4>
                <p className="text-sm text-gray-500">Structure optimization & descriptors</p>
              </div>
              <Badge variant={preparationStatus.ligandPrepared ? "default" : "secondary"} className="flex items-center gap-1">
                {preparationStatus.ligandPrepared && <CheckCircle className="h-3 w-3" />}
                {preparationStatus.ligandPrepared ? "Ready" : "Pending"}
              </Badge>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Receptor Preparation</h4>
                <p className="text-sm text-gray-500">Structure processing & analysis</p>
              </div>
              <Badge variant={preparationStatus.receptorPrepared ? "default" : "secondary"} className="flex items-center gap-1">
                {preparationStatus.receptorPrepared && <CheckCircle className="h-3 w-3" />}
                {preparationStatus.receptorPrepared ? "Ready" : "Pending"}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Run Prediction */}
        <div className="text-center">
          <Button 
            onClick={handleDockingPrediction}
            disabled={isRunning || !ligandSmiles || (!customFasta && !customPdbData)}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? `Running ${selectedModel} Analysis...` : `Start ${selectedModel} Prediction`}
          </Button>
          
          {isRunning && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-gray-600">{currentStep}</p>
            </div>
          )}
        </div>

        {/* Enhanced Results Display */}
        {predictionResults && (
          <div className="mt-6 space-y-4">
            <Separator />
            <h3 className="text-lg font-semibold">Enhanced Deep Learning Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <h4 className="font-medium">Binding Affinity</h4>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {predictionResults.affinityScore.toFixed(2)} {predictionResults.metricType || 'pKd'}
                </div>
                <p className="text-sm text-gray-500">{predictionResults.modelUsed}</p>
              </Card>
              
              <Card className="p-4 text-center">
                <h4 className="font-medium">Confidence Score</h4>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  {predictionResults.confidence}%
                </div>
                <p className="text-sm text-gray-500">Model Confidence</p>
              </Card>

              <Card className="p-4 text-center">
                <h4 className="font-medium flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4" />
                  Processing Time
                </h4>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  {predictionResults.processingTime}ms
                </div>
                <p className="text-sm text-gray-500">Runtime</p>
              </Card>
            </div>

            {/* Model Metadata */}
            <Card className="p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Prediction Metadata
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Model Version:</span>
                  <div className="font-mono">{predictionResults.modelVersion}</div>
                </div>
                <div>
                  <span className="text-gray-500">Input Hash:</span>
                  <div className="font-mono">{predictionResults.inputHash.slice(0, 8)}...</div>
                </div>
                <div>
                  <span className="text-gray-500">Metric Type:</span>
                  <div className="font-medium">{predictionResults.metricType}</div>
                </div>
                <div>
                  <span className="text-gray-500">Training Data:</span>
                  <div className="font-medium">{predictionResults.trainingDataUsed.length} refs</div>
                </div>
              </div>
            </Card>

            {/* Training Dataset Reference */}
            <Card className="p-4">
              <h4 className="font-medium mb-2">Prediction Basis & Training References</h4>
              <p className="text-sm text-gray-600 mb-3">
                This prediction uses enhanced molecular descriptors and protein sequence analysis 
                based on our curated dataset of 20 diverse protein-ligand complexes with 
                experimentally determined binding affinities (1.3 to 9.47 pKd range).
              </p>
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-700">Most Similar Training Examples:</span>
                {predictionResults.trainingDataUsed.map((ref, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {ref}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DockingPredictionEngine;
